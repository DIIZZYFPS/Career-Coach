// Define the Message type to match your component's state
type Message = {
  content: string;
  sender: {
    type: "user" | "ai";
  };
};

// Define the conversation history type for the API
type ConversationHistory = {
  role: "user" | "assistant";
  content: string;
}[];

const API_URL = "http://localhost:8000"; // Your FastAPI server URL

const fetchStreamedResponse = async (
  messages: Message[], // Pass the whole message history
  onToken: (token: string) => void,
  file: File | null
) => {
  // Convert your frontend message format to the format the backend expects
  const conversation_history: ConversationHistory = messages.map(msg => ({
    role: msg.sender.type === 'user' ? "user" : "assistant" as "user" | "assistant",
    content: msg.content
  })).reverse(); // Reverse to get chronological order for the API

  // Use FormData to send both the JSON and a file
  const formData = new FormData();
  formData.append('conversation_json', JSON.stringify(conversation_history));
  if (file) {
    formData.append('file', file);
  }

  try {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      body: formData, // Send as FormData
    });

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onToken(chunk); // Callback to update UI with the new token
    }
  } catch (error) {
    console.error("Error fetching streamed response:", error);
    onToken("\n\n[Error: Could not connect to the AI server.]");
  }
};

export default fetchStreamedResponse;