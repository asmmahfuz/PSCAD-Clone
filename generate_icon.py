import os
from PIL import Image, ImageDraw, ImageFilter

def create_app_icon(output_path="app-icon.png", size=(1024, 1024)):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Base rounded badge with smooth gradient
    margin = 48
    radius = 220
    
    # Create mask for rounded rectangle
    mask = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, size[0] - margin, size[1] - margin],
        radius=radius,
        fill=255
    )
    
    # Create background gradient
    bg = Image.new("RGBA", size, (15, 23, 42, 255)) # Dark navy
    bg_draw = ImageDraw.Draw(bg)
    
    for y in range(margin, size[1] - margin):
        factor = (y - margin) / (size[1] - 2 * margin)
        # Deep dark blue to deep purple gradient
        r = int(10 + factor * 25)
        g = int(15 + factor * 10)
        b = int(35 + factor * 60)
        bg_draw.line([(margin, y), (size[0] - margin, y)], fill=(r, g, b, 255))
        
    img.paste(bg, (0, 0), mask)
    
    # Add subtle border
    border_img = Image.new("RGBA", size, (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_img)
    border_draw.rounded_rectangle(
        [margin, margin, size[0] - margin, size[1] - margin],
        radius=radius,
        outline=(99, 102, 241, 180), # Indigo border
        width=8
    )
    img = Image.alpha_composite(img, border_img)
    
    # Glowing EMT Sinusoidal Waves & Lightning Bolt
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Sinusoidal Grid Curves (3-phase style)
    import math
    
    # Phase A: Cyan
    points_a = []
    for x in range(120, 904, 4):
        y = 512 + math.sin((x - 120) * 0.015) * 140
        points_a.append((x, y))
    
    # Phase B: Purple
    points_b = []
    for x in range(120, 904, 4):
        y = 512 + math.sin((x - 120) * 0.015 + 2.094) * 140
        points_b.append((x, y))
        
    # Phase C: Amber/Gold
    points_c = []
    for x in range(120, 904, 4):
        y = 512 + math.sin((x - 120) * 0.015 + 4.188) * 140
        points_c.append((x, y))

    for p_set, col in [(points_a, (6, 182, 212, 160)), (points_b, (168, 85, 247, 160)), (points_c, (245, 158, 11, 160))]:
        for i in range(len(p_set) - 1):
            glow_draw.line([p_set[i], p_set[i+1]], fill=col, width=12)

    # Central Electric Bolt
    bolt_points = [
        (560, 180),
        (380, 500),
        (500, 500),
        (440, 840),
        (660, 480),
        (540, 480),
        (600, 180)
    ]
    
    # Glow layer for bolt
    bolt_glow = Image.new("RGBA", size, (0, 0, 0, 0))
    bolt_glow_draw = ImageDraw.Draw(bolt_glow)
    bolt_glow_draw.polygon(bolt_points, fill=(139, 92, 246, 220))
    bolt_glow = bolt_glow.filter(ImageFilter.GaussianBlur(radius=24))
    
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, bolt_glow)
    
    # Sharp bolt with electric cyan-white gradient
    bolt_sharp = Image.new("RGBA", size, (0, 0, 0, 0))
    bolt_sharp_draw = ImageDraw.Draw(bolt_sharp)
    bolt_sharp_draw.polygon(bolt_points, fill=(240, 249, 255, 255), outline=(56, 189, 248, 255))
    img = Image.alpha_composite(img, bolt_sharp)
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) if os.path.dirname(output_path) else ".", exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Generated {output_path} successfully ({size[0]}x{size[1]}).")

if __name__ == "__main__":
    create_app_icon("app-icon.png")
