import os
import requests
import re

# Font mapping: (Family Name, Weight) -> URL
fonts_to_download = {
    ("DM_Sans", "400"): "https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2",
    ("DM_Sans", "500"): "https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2", # Note: Google often uses the same file for variable fonts or overlapping subsets
    ("DM_Sans", "600"): "https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2",
    ("DM_Sans", "700"): "https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2",
    ("Playfair_Display", "400"): "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2",
    ("Playfair_Display", "500"): "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2",
    ("Playfair_Display", "600"): "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2",
    ("Playfair_Display", "700"): "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2"
}

fonts_dir = r"c:\Users\USUARIO\Desktop\Programación\neotesis\tesis-express-pro-main\public\fonts"

if not os.path.exists(fonts_dir):
    os.makedirs(fonts_dir)

# We use a set to avoid downloading the same URL multiple times if used by different weights
downloaded_urls = {}

for (family, weight), url in fonts_to_download.items():
    if url not in downloaded_urls:
        filename = f"{family}-{weight}.woff2"
        filepath = os.path.join(fonts_dir, filename)
        
        print(f"Downloading {family} {weight}...")
        response = requests.get(url)
        if response.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(response.content)
            downloaded_urls[url] = filename
            print(f"Saved to {filename}")
        else:
            print(f"Failed to download {family} {weight}: {response.status_code}")
    else:
        # If the URL was already downloaded, we just use the existing file
        print(f"URL for {family} {weight} already downloaded as {downloaded_urls[url]}")
