import fitz  # PyMuPDF
import json
import os
import re
from PIL import Image
import io

pdf_path = r"c:\Users\arthu\git\myranor-encra\src\data\myranor_monsterbuch_dl_version_liber_monstrorum_myranis_20251215.pdf"
toc_path = r"c:\Users\arthu\git\myranor-encra\scripts\toc.json"
output_json_path = r"c:\Users\arthu\git\myranor-encra\scripts\extracted_raw_monsters.json"
image_output_dir = r"c:\Users\arthu\git\myranor-encra\scripts\temp_images"

os.makedirs(image_output_dir, exist_ok=True)

# Helper to normalize names to slug
def make_slug(name):
    name = name.lower()
    name = name.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    name = name.replace(" ", "-").replace("'", "").replace("’", "")
    name = re.sub(r'[^a-z0-9_-]', '', name)
    return name

# Helper to clean up German text formatting
def clean_text(text):
    # Replace hyphen followed by newline and optional whitespace (soft hyphens)
    text = re.sub(r'(\w+)-\n\s*(\w+)', r'\1\2', text)
    # Replace remaining newlines with spaces
    text = re.sub(r'\n+', ' ', text)
    # Clean multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

# Helper to shorten description to max sentences
def shorten_description(text, max_sentences=3):
    text = clean_text(text)
    # Split by sentence endings (dot, exclamation, question mark followed by space or end of string)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    shortened = " ".join(sentences[:max_sentences])
    return shortened

# Helper to find stats block
def extract_stats_block(pages_text, monster_name):
    cleaned_name = make_slug(monster_name)
    for page_text in pages_text:
        lines = [l.strip() for l in page_text.split('\n')]
        for i in range(len(lines)):
            line = lines[i]
            line_slug = make_slug(line)
            # Match name or name prefix or substring
            if line_slug and (line_slug == cleaned_name or line_slug in cleaned_name or cleaned_name in line_slug or (len(line) > 3 and cleaned_name.startswith(line_slug))):
                # Look ahead for stats indicators
                found = False
                for j in range(i+1, min(i+8, len(lines))):
                    lower_line = lines[j].lower()
                    if "herausforderungsgrad" in lower_line or "rüstungsklasse" in lower_line or "trefferpunkte" in lower_line or "rk " in lower_line or "tp " in lower_line:
                        found = True
                        break
                if found:
                    return "\n".join(lines[i:])
    return None

# 1. Load PDF and TOC
print("Loading PDF and TOC...")
doc = fitz.open(pdf_path)

with open(toc_path, "r", encoding="utf-8") as f:
    toc = json.load(f)

# 2. Filter monster TOC entries (level 2, between Myranische Monster and Anhang: Myranische Tiere)
monsters_toc = []
in_monsters_section = False
for item in toc:
    level, title, page = item
    if title == "Myranische Monster":
        in_monsters_section = True
        continue
    if title == "Anhang: Myranische Tiere":
        in_monsters_section = False
        break
    if in_monsters_section and level == 2:
        monsters_toc.append((title, page))

print(f"Found {len(monsters_toc)} monsters in TOC.")

# 3. Pre-scan all PDF pages to build an image frequency map to find background graphics
print("Scanning image frequencies...")
image_freq = {}
for page in doc:
    images = page.get_images(full=True)
    for img in images:
        xref = img[0]
        image_freq[xref] = image_freq.get(xref, 0) + 1

print(f"Unique images: {len(image_freq)}")

# 4. Extract data for each monster
extracted_monsters = []

for idx, (title, start_page) in enumerate(monsters_toc):
    # Determine the page range
    # start_page is 1-indexed, so 0-indexed start is start_page - 1
    start_idx = start_page - 1
    
    # Find where the next TOC item starts
    if idx + 1 < len(monsters_toc):
        next_title, next_start_page = monsters_toc[idx + 1]
        end_idx = next_start_page - 2  # up to page before next monster
    else:
        # If last monster, check where the next level 1 item starts (which is Anhang on page 198)
        # So it ends on page 197 (index 196)
        end_idx = 196
    
    # Make sure page indices are bounds safe
    start_idx = max(0, min(start_idx, len(doc) - 1))
    end_idx = max(start_idx, min(end_idx, len(doc) - 1))
    
    print(f"[{idx+1}/{len(monsters_toc)}] Processing {title} (Pages {start_idx+1}-{end_idx+1})...")
    
    pages_text = []
    monster_images = []
    
    for p_idx in range(start_idx, end_idx + 1):
        page = doc[p_idx]
        pages_text.append(page.get_text())
        
        # Collect images on page
        images = page.get_images(full=True)
        for img in images:
            xref = img[0]
            # Ignore background images (appearing on more than 5 pages)
            if image_freq.get(xref, 0) > 5:
                continue
            
            base_image = doc.extract_image(xref)
            width = base_image["width"]
            height = base_image["height"]
            
            # Filter out tiny icons
            if width < 100 or height < 100:
                continue
                
            # Filter out banners (extreme ratios)
            ratio = width / height
            if ratio > 2.2 or ratio < 0.45:
                continue
                
            # Save candidates
            monster_images.append({
                "xref": xref,
                "width": width,
                "height": height,
                "area": width * height,
                "bytes": base_image["image"],
                "ext": base_image["ext"]
            })
            
    # Parse text from first page
    first_page_text = pages_text[0]
    
    # Extract Size, Weight, Quantity, Distribution using regex
    # The patterns are usually:
    # Größe: ...
    # Gewicht: ...
    # Menge: ...
    # Verbreitung: ...
    groesse_match = re.search(r'Größe:\s*(.*?)(?=\n|$|Gewicht:|Menge:|Verbreitung:)', first_page_text, re.IGNORECASE)
    gewicht_match = re.search(r'Gewicht:\s*(.*?)(?=\n|$|Größe:|Menge:|Verbreitung:)', first_page_text, re.IGNORECASE)
    menge_match = re.search(r'Menge:\s*(.*?)(?=\n|$|Größe:|Gewicht:|Verbreitung:)', first_page_text, re.IGNORECASE)
    
    # Verbreitung is usually the last fluff line, and it might span multiple lines
    verbreitung_match = re.search(r'Verbreitung:\s*(.*?)(?=\n\n|\n[A-Z]|\n\t|Abenteuerideen|Verbreitung$|$)', first_page_text, re.DOTALL | re.IGNORECASE)
    
    groesse = clean_text(groesse_match.group(1)) if groesse_match else ""
    gewicht = clean_text(gewicht_match.group(1)) if gewicht_match else ""
    menge = clean_text(menge_match.group(1)) if menge_match else ""
    verbreitung = clean_text(verbreitung_match.group(1)) if verbreitung_match else ""
    
    # Try to find introductory description
    # Split the first page text by double newlines into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', first_page_text) if p.strip()]
    
    intro_desc = ""
    for para in paragraphs:
        # Skip title, page number, and subheadings
        clean_para = para.replace("\n", " ").strip()
        # If it's a number (page number) or equals the title or is page header
        if re.match(r'^\d+$', clean_para):
            continue
        if clean_para.lower() == title.lower() or title.lower() in [w.lower() for w in clean_para.split()[:3]]:
            # E.g. "Albenwulf" or "Albschmeichler"
            continue
        # Also skip detail headings like "Grausame Bosheit.", "Schwarz wie die Nacht."
        # A heading usually starts with 2-3 words followed by a dot, and is at the start of the paragraph
        if re.match(r'^[A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zA-ZäöüÄÖÜß]+){0,3}\.', clean_para):
            continue
        # Skip size/weight/quantity lines
        if clean_para.lower().startswith("größe:") or clean_para.lower().startswith("gewicht:") or clean_para.lower().startswith("menge:") or clean_para.lower().startswith("verbreitung:"):
            continue
            
        intro_desc = para
        break
        
    short_desc = shorten_description(intro_desc) if intro_desc else f"Ein Wesen namens {title} aus den Regionen Myranors."
    
    # Locate stats block
    stats_block = extract_stats_block(pages_text, title)
    if not stats_block:
        print(f"  WARNING: Stats block not found for {title}!")
        stats_block = ""
        
    # Extract monster image (largest candidate)
    image_file_name = ""
    image_url = ""
    if monster_images:
        # Sort by area descending
        monster_images.sort(key=lambda x: x["area"], reverse=True)
        best_image = monster_images[0]
        
        # Save image to temp folder as WebP
        slug = make_slug(title)
        image_file_name = f"{slug}.webp"
        image_save_path = os.path.join(image_output_dir, image_file_name)
        
        try:
            img_data = best_image["bytes"]
            img = Image.open(io.BytesIO(img_data))
            
            # Convert CMYK/RGBA to RGB/RGBA as needed for WebP
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
                
            img.save(image_save_path, "WEBP", quality=85)
            image_url = f"user-uploads/official/{image_file_name}"
            # print(f"  Extracted image {image_file_name} ({best_image['width']}x{best_image['height']})")
        except Exception as e:
            print(f"  Failed to save image for {title}: {e}")
            
    extracted_monsters.append({
        "id": make_slug(title),
        "name": title,
        "description": short_desc,
        "groesse": groesse,
        "gewicht": gewicht,
        "menge": menge,
        "verbreitung": verbreitung,
        "stats_block": stats_block,
        "image_url": image_url
    })

# Save JSON output
with open(output_json_path, "w", encoding="utf-8") as f:
    json.dump(extracted_monsters, f, ensure_ascii=False, indent=2)

print(f"Successfully extracted {len(extracted_monsters)} monsters to {output_json_path}")
print(f"Extracted images are in {image_output_dir}")
