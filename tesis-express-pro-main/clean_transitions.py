import os

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('transition-all', 'transition')
    
    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

src_dir = r"c:\Users\USUARIO\Desktop\Programación\neotesis\tesis-express-pro-main\src"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            replace_in_file(os.path.join(root, file))
