import axios from 'axios';
export const revalidate = 300;
export async function GET() {
  try {
    const url = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';
    const { data } = await axios.post(url, new URLSearchParams({
      key: process.env.JAP_API_KEY, action: 'services'
    }).toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' }, timeout: 15000 });
    return Response.json(data, { status: 200 });
  } catch {
    return Response.json([], { status: 200 });
  }
}
