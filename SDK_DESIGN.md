# PrimeSoft Alliance - SDK Design & Architecture

## 1. Core SDK Architecture Guiding Principles

To ensure consistency across JavaScript, TypeScript, Python, PHP, Go, Java, C#, Ruby, and Rust, all PrimeSoft SDKs follow these core architectural guidelines:

### 1.1 Object & Module Structure
- **Configurable Client**: The entry point is always a `PrimeSoftClient` (or idiomatically named `PrimeSoft`) instantiated with configuration.
- **Resource Namespaces**: APIs are grouped logically (e.g., `client.chat`, `client.bookings`, `client.content`).
- **Idempotency**: Transparently handles Idempotency-Key header injection for POST requests.
- **Retries**: Configurable automatic retries with exponential backoff on `429` (Rate Limit) and `5xx` errors.

### 1.2 Cross-Cutting Concerns
- **Streaming (SSE)**: Uses Server-Sent Events natively mapped to idiomatic async streams/iterators (e.g., `AsyncGenerator` in TS, `IAsyncEnumerable` in C#, `async generators` in Python).
- **Pagination Iterators**: Abstracted pagination (cursor/offset) via iterators. Instead of requesting page 2 manually, developers iterate over the resource `for item in client.bookings.list()`.
- **Webhook Verification**: Built-in cryptographic helpers `client.webhooks.verifySignature(payload, signature, secret)`.
- **Typing**: Strongly typed models mirroring the OpenAPI schemas. Enums for statuses.

---

## 2. TypeScript / JavaScript (Node.js & Browser)

**Package Structure:**
```
src/
├── index.ts           # Exports PrimeSoftClient
├── client.ts          # Core HTTP transport (fetch wrapper)
├── resources/         # Namespaces
│   ├── chat.ts
│   ├── bookings.ts
│   ├── webhooks.ts
│   └── media.ts
├── errors.ts          # PrimeSoftError, RateLimitError
└── utils/
    ├── pagination.ts  # AsyncIterator for pages
    └── webhooks.ts    # Crypto utilities
```

**Examples:**

```typescript
import { PrimeSoft } from '@primesoft/sdk';

const client = new PrimeSoft({
  apiKey: process.env.PRIMESOFT_API_KEY,
  clientId: 'tenant_123',
  maxRetries: 3
});

// 1. Streaming Chat (Async Iterator)
async function chat() {
  const stream = await client.chat.stream({
    message: "I need to book a plumbing service",
    sessionId: "sess_abc123"
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
}

// 2. Webhook Verification
import express from 'express';
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-primesoft-signature'];
  try {
    const event = client.webhooks.constructEvent(
      req.body, // Raw buffer
      signature,
      process.env.WEBHOOK_SECRET
    );
    console.log("Verified event:", event.type);
    res.send('OK');
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

---

## 3. Python

**Package Structure:**
```
primesoft/
├── __init__.py
├── client.py         # PrimeSoft (sync), AsyncPrimeSoft (async/httpx)
├── resources/
│   ├── chat.py
│   ├── bookings.py
...
```

**Examples:**

```python
import os
from primesoft import PrimeSoft

client = PrimeSoft(
    api_key=os.environ.get("PRIMESOFT_API_KEY"),
    client_id="tenant_123"
)

# 1. Bookings (Pagination Helper)
def list_all_bookings():
    # .list() returns a generator that auto-fetches pages
    for booking in client.bookings.list(limit=50):
        print(f"Booking {booking.id}: {booking.customer_name}")

# 2. Async Streaming Chat
import asyncio
from primesoft import AsyncPrimeSoft

async def stream_chat():
    async_client = AsyncPrimeSoft(client_id="tenant_123")
    stream = await async_client.chat.stream(message="Hello")
    
    async for chunk in stream:
        print(chunk, end="")

asyncio.run(stream_chat())
```

---

## 4. Go

**Package Structure:**
```
github.com/primesoft/primesoft-go/
├── primesoft.go          // Client configuration and initialization
├── chat.go               // ChatService
├── bookings.go           // BookingsService
├── webhooks.go           // Webhook Event structs & crypto
├── request.go            // Retry logic, standard envelopes
```

**Examples:**

```go
package main

import (
	"context"
	"fmt"
	"os"
	
	"github.com/primesoft/primesoft-go"
	"github.com/primesoft/primesoft-go/chat"
)

func main() {
	client := primesoft.NewClient(
		primesoft.WithAPIKey(os.Getenv("PRIMESOFT_API_KEY")),
		primesoft.WithClientID("tenant_123"),
	)

	// Context mapping for timeouts
	ctx := context.Background()

	// 1. Create a Lead
	lead, err := client.Leads.Create(ctx, primesoft.LeadParams{
		Name:  "Jane Doe",
		Email: "jane@example.com",
	})
	if err != nil {
		panic(err)
	}
	fmt.Printf("Lead created: %s\n", lead.ContactID)
}
```

---

## 5. C# (.NET)

**Package Structure:**
Makes heavy use of `HttpClientFactory` for DI injection in ASP.NET Core environments, exposing interfaces like `IPrimeSoftClient`.

**Examples:**

```csharp
using PrimeSoft;
using PrimeSoft.Models;

var options = new PrimeSoftOptions {
    ApiKey = "sk_test_...",
    ClientId = "tenant_123"
};
var client = new PrimeSoftClient(options);

// 1. Streaming Chat (IAsyncEnumerable)
var request = new ChatStreamRequest { Message = "Pricing info?" };
await foreach (var chunk in client.Chat.StreamAsync(request))
{
    Console.Write(chunk.Text);
}

// 2. Upload Media (Pre-Signed URL flow)
var uploadUrlResponse = await client.Media.CreateUploadUrlAsync(new MediaUploadOptions {
    Filename = "diagram.png",
    MimeType = "image/png",
    Size = 1048576 
});

// SDK Helper automatically handles pushing the bytes to the S3 Presigned URL
await client.Media.UploadFileAsync(uploadUrlResponse.UploadUrl, fileStream);
```

---

## 6. Java

**Package Structure:**
Uses `OkHttp` internally with `CompletableFuture` for non-blocking asynchronous calls.

**Examples:**

```java
import com.primesoft.PrimeSoftClient;
import com.primesoft.models.Booking;

public class App {
    public static void main(String[] args) {
        PrimeSoftClient client = PrimeSoftClient.builder()
            .apiKey(System.getenv("PRIMESOFT_API_KEY"))
            .clientId("tenant_123")
            .maxRetries(3)
            .build();

        // 1. Sync Call
        Booking booking = client.bookings().create(
            BookingCreateParams.builder()
                .customerName("John Smith")
                .serviceId("srv_plumb_expert")
                .date("2026-05-20")
                .time("14:00")
                .email("jsmith@example.com")
                .build()
        );
        System.out.println("Created: " + booking.getBookingId());

        // 2. Webhook verification
        try {
            client.webhooks().constructEvent(rawJsonBody, signatureHeader, secret);
        } catch (SignatureVerificationException e) {
            // Handle invalid signature
        }
    }
}
```

---

## 7. PHP

**Structure:** Target PSR-7 / PSR-18 standards. Uses Guzzle HTTP under the hood if no PSR-18 client is provided.

**Examples:**

```php
use PrimeSoft\PrimeSoftClient;

$client = new PrimeSoftClient([
    'api_key' => $_ENV['PRIMESOFT_API_KEY'],
    'client_id' => 'tenant_123'
]);

// 1. Auto-pagination (Returns a Generator)
$bookings = $client->bookings->list(['limit' => 50]);

foreach ($bookings->autoPagingIterator() as $booking) {
    echo "Booking ID: " . $booking->bookingId . "\n";
}
```

---

## 8. Ruby

**Structure:** A standard Gem utilizing `Faraday` with custom middleware layers for auth, idempotency, and retries.

**Examples:**

```ruby
require 'primesoft'

client = PrimeSoft::Client.new(
  api_key: ENV['PRIMESOFT_API_KEY'],
  client_id: 'tenant_123'
)

# 1. Block-based Steaming Chat
client.chat.stream(message: "Describe your HVAC services") do |chunk|
  print chunk
end

# 2. Block-based Pagination
client.bookings.list.each_page do |page|
  puts "Processing page containing #{page.data.length} items"
end
```

---

## 9. Rust

**Structure:** Tokio + Reqwest ecosystem. Strong emphasis on Ownership, `Result`, and `Stream` trait.

**Examples:**

```rust
use primesoft::{Client, ClientOptions};
use primesoft::models::LeadCreateParams;
use futures_util::stream::StreamExt; // For streaming chat

#[tokio::main]
async fn main() -> Result<(), primesoft::Error> {
    let client = Client::new(ClientOptions {
        api_key: std::env::var("PRIMESOFT_API_KEY").unwrap(),
        client_id: "tenant_123".to_string(),
        ..Default::default()
    });

    // 1. Create Form Submission
    let form = client.forms().submit("form_123", serde_json::json!({
        "first_name": "Alice",
        "custom_inquiry": "Do you handle emergency leaks at 2 AM?"
    })).await?;

    // 2. Chat Streaming using Rust Streams
    let mut chat_stream = client.chat().stream("Emergency rates?").await?;
    
    while let Some(chunk_result) = chat_stream.next().await {
        let chunk = chunk_result?;
        print!("{}", chunk.text);
    }

    Ok(())
}
```

## Internal Retry & Error Strategy

All SDKs implement interceptors / middleware with the following pseudo-logic:

```text
Function ExecuteRequest(req, retryCount):
  res = HTTP_CLIENT.send(req)
  
  if res.status == 429 or res.status >= 500:
    if retryCount < MAX_RETRIES:
       wait_time = min(INITIAL_BACKOFF * (2 ^ retryCount), MAX_BACKOFF)
       
       // Respect Retry-After if provided
       if res.headers['Retry-After']:
          wait_time = parseInt(res.headers['Retry-After'])

       sleep(wait_time +/- jitter)
       return ExecuteRequest(req, retryCount + 1)
       
  if res.status >= 400:
    throw PrimeSoftAPIError(parseErrorEnvelope(res.body))
    
  return parseSuccessEnvelope(res.body)
```
