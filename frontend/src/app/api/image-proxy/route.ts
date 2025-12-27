import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Get the original image URL from the query parameter
        const {searchParams} = new URL(request.url);
        const imageUrl = searchParams.get('url');

        // Validate the URL parameter
        if (!imageUrl) {
            return NextResponse.json(
                {error: 'Missing url parameter'},
                {status: 400}
            );
        }

        // Only allow proxying from approved domains for security
        const validDomains = [
            'rootsmusicreport.com',
            'www.rootsmusicreport.com',
            'api.dicebear.com',
            'images.unsplash.com'
        ];

        const urlObj = new URL(imageUrl);
        const isValid = validDomains.some(domain =>
            urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );

        if (!isValid) {
            return NextResponse.json(
                {error: 'Domain not allowed'},
                {status: 403}
            );
        }

        // Fetch the image
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json(
                {error: 'Failed to fetch image'},
                {status: response.status}
            );
        }

        // Get the image data
        const imageBuffer = await response.arrayBuffer();

        // Get the content type from the original response
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return the image with appropriate headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json(
            {error: 'Failed to proxy image'},
            {status: 500}
        );
    }
}
