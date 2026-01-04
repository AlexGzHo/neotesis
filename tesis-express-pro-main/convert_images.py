from PIL import Image
import os

public_dir = r"c:\Users\USUARIO\Desktop\Programación\neotesis\tesis-express-pro-main\public"
images = [
    "facebook-profile1 - hombre.png",
    "facebook-profile2 - hombre.png",
    "facebook-profile3 - mujer.png",
    "facebook-profile4 - mujer.png",
    "facebook-profile5 - mujer.png",
    "facebook-profile-6 - hombre.png"
]

for img_name in images:
    input_path = os.path.join(public_dir, img_name)
    output_name = img_name.replace(".png", ".webp")
    output_path = os.path.join(public_dir, output_name)
    
    if os.path.exists(input_path):
        with Image.open(input_path) as img:
            # Resize to 112x112 (good balance for 56x56 display on retina)
            img = img.resize((112, 112), Image.Resampling.LANCZOS)
            img.save(output_path, "WEBP", quality=80)
            print(f"Converted {img_name} to {output_name} (Resized to 112x112)")
    else:
        print(f"File not found: {input_path}")
