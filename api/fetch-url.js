export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body || {}
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url in request body' })
  }

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  // Naver mobile blog → use PostView iframe URL for server-rendered content
  let fetchUrl = url
  const naverBlogMatch = url.match(/blog\.naver\.com\/([^/?]+)\/(\d+)/)
  if (naverBlogMatch) {
    fetchUrl = `https://blog.naver.com/PostView.naver?blogId=${naverBlogMatch[1]}&logNo=${naverBlogMatch[2]}`
  }

  try {
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch URL: ${response.status}` })
    }

    const html = await response.text()

    // Try to extract main content container for known blog platforms
    let contentHtml = html
    // Naver SmartEditor content
    const naverContent = html.match(/<div class="se-main-container"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i)
    if (naverContent) {
      contentHtml = naverContent[0]
    }

    // Strip non-content elements
    const cleaned = contentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // Convert block elements to newlines to preserve structure
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      // Clean up whitespace while preserving line breaks
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Truncate to ~20k chars to stay within Claude token limits
    const truncated = cleaned.length > 20000 ? cleaned.slice(0, 20000) : cleaned

    res.status(200).json({ text: truncated })
  } catch (err) {
    res.status(502).json({ error: `Failed to fetch URL: ${err.message}` })
  }
}
