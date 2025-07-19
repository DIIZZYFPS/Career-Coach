// Add this helper function inside your component or in a utils file
export default async function fetchStreamedResponse(
  instruction: string,
  input_text: string,
  onToken: (token: string) => void,
  file: File | null
) {

    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    formData.append("instruction", instruction);
    formData.append("input_text", input_text);

  const response = await fetch("http://localhost:8000/query", {
    method: "POST",
    body: formData 
  });

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      onToken(decoder.decode(value));
    }
  }
}