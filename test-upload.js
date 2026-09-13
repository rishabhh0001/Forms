const url = "https://script.google.com/macros/s/AKfycbyHvmPHSlhszOKQcoPfB57rdY7PPqlj_gv--bRm8106Z1m1YZR-aCdhEZ3fLcXeanFP/exec";

async function testUpload() {
  console.log("Testing Apps Script upload endpoint...");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "test.txt",
      mimeType: "text/plain",
      base64: "SGVsbG8gV29ybGQ=" // "Hello World"
    })
  });
  
  const raw = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", raw);
}

testUpload();
