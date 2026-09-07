// A route response avoids a streamed admin layout turning a missing setup page
// into a 200 response. API writes are independently protected by the Users hook.
export function GET() {
  return new Response('Use the local CMS administrator bootstrap command.', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' },
  })
}
