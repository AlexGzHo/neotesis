from PIL import Image
import os

assets_dir = r"c:\Users\USUARIO\Desktop\Programación\neotesis\tesis-express-pro-main\src\assets"
hero_img = "hero-graduate.jpg"
output_name = "hero-graduate.webp"

input_path = os.path.join(assets_dir, hero_img)
output_path = os.path.join(assets_dir, output_name)

if os.path.exists(input_path):
    with Image.open(input_path) as img:
        width, height = img.size
        # Redimensionamos a 800px de ancho (suficiente para max-w-md en retina y se ve genial)
        # 800px es un buen balance. Si queremos bajar de 22KB, bajaremos calidad a 60.
        new_width = 800
        new_height = int((new_width / width) * height)
        
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Guardar con calidad 60 para forzar el bajo peso sin perder demasiada nitidez
        img.save(output_path, "WEBP", quality=60, method=6) # method=6 es compresión más lenta/mejor
        
        final_size = os.path.getsize(output_path) / 1024
        print(f"Dimensiones finales: {new_width}x{new_height}")
        print(f"Peso final: {final_size:.2f} KB")
else:
    print(f"File not found: {input_path}")
