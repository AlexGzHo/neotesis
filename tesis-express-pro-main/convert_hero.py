from PIL import Image
import os

assets_dir = r"c:\Users\USUARIO\Desktop\Programación\neotesis\tesis-express-pro-main\src\assets"
hero_img = "hero-graduate.jpg"
output_name = "hero-graduate.webp"

input_path = os.path.join(assets_dir, hero_img)
output_path = os.path.join(assets_dir, output_name)

if os.path.exists(input_path):
    with Image.open(input_path) as img:
        # La imagen original pesa 53KB, es pequeña pero JPG.
        # Vamos a convertirla a WebP con buena calidad para mantener la estética premium
        # No redimensionamos porque el ancho visual en el código es max-w-md (448px)
        # pero la imagen original podría ser usada para pantallas más grandes.
        # Mantendremos el tamaño original pero en formato moderno.
        img.save(output_path, "WEBP", quality=85)
        print(f"Converted {hero_img} to {output_name} in assets folder")
else:
    print(f"File not found: {input_path}")
