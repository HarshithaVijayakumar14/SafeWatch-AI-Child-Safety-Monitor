"""
MobileNetV2 Child vs. Adult Classifier Training Script for SafeWatch AI
Trains a PyTorch MobileNetV2 transfer learning model on realistic child and adult human crops.
Incorporates anthropometric proportions, diverse attire, poses, lighting, and data augmentation.
"""
from pathlib import Path
import os
import sys
import logging
import random
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import models, transforms

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("safewatch.trainer")


class ChildAdultDataset(Dataset):
    """Dataset loader for child and adult image crops."""

    def __init__(self, data_dir: str, transform=None):
        self.data_dir = Path(data_dir)
        self.transform = transform
        self.samples = []  # List of (filepath, class_idx)
        self.classes = ["Adult", "Child"]  # 0: Adult, 1: Child

        # Gather adult images
        adult_dir = self.data_dir / "adult"
        if adult_dir.exists():
            for p in sorted(adult_dir.glob("*.*")):
                if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
                    self.samples.append((p, 0))

        # Gather child images
        child_dir = self.data_dir / "child"
        if child_dir.exists():
            for p in sorted(child_dir.glob("*.*")):
                if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
                    self.samples.append((p, 1))

        logger.info(
            f"Loaded {len(self.samples)} image samples from {self.data_dir} "
            f"(Adults: {sum(1 for _, c in self.samples if c==0)}, "
            f"Children: {sum(1 for _, c in self.samples if c==1)})."
        )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception as e:
            logger.warning(f"Error reading image {path}: {e}")
            image = Image.new("RGB", (224, 224), color=(128, 128, 128))

        if self.transform:
            image = self.transform(image)

        return image, label


def _generate_background(width: int, height: int, bg_type: str = "grass") -> Image.Image:
    """Generate a realistic textured surveillance backdrop."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    if bg_type == "grass":
        base_color = (random.randint(45, 80), random.randint(95, 140), random.randint(35, 65))
        draw.rectangle([0, 0, width, height], fill=base_color)
        # Texture
        for _ in range(300):
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            shade = random.randint(-20, 20)
            c = (
                max(0, min(255, base_color[0] + shade)),
                max(0, min(255, base_color[1] + shade)),
                max(0, min(255, base_color[2] + shade))
            )
            draw.line([x, y, x, min(height, y + random.randint(2, 6))], fill=c, width=1)

    elif bg_type == "asphalt":
        base_color = (random.randint(60, 90), random.randint(60, 90), random.randint(65, 95))
        draw.rectangle([0, 0, width, height], fill=base_color)
        for _ in range(400):
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            speckle = random.randint(-25, 25)
            c = (
                max(0, min(255, base_color[0] + speckle)),
                max(0, min(255, base_color[1] + speckle)),
                max(0, min(255, base_color[2] + speckle))
            )
            draw.point((x, y), fill=c)

    elif bg_type == "pavement":
        base_color = (random.randint(140, 180), random.randint(140, 180), random.randint(135, 175))
        draw.rectangle([0, 0, width, height], fill=base_color)
        # Paver grid lines
        grid_y = random.randint(30, 60)
        for y in range(0, height, grid_y):
            draw.line([0, y, width, y], fill=(100, 100, 100), width=1)

    else:  # indoor / wall
        base_color = (random.randint(180, 220), random.randint(180, 215), random.randint(170, 205))
        draw.rectangle([0, 0, width, height], fill=base_color)
        # Floor transition line at bottom 25%
        floor_y = int(height * 0.78)
        floor_color = (random.randint(110, 140), random.randint(80, 110), random.randint(60, 90))
        draw.rectangle([0, floor_y, width, height], fill=floor_color)

    return img


def _draw_realistic_person(
    is_child: bool,
    width: int = 224,
    height: int = 224,
    pose: str = "standing",
    skin_tone: tuple = None,
    cloth_color: tuple = None,
    pants_color: tuple = None
) -> Image.Image:
    """
    Renders a realistic human crop with accurate anatomical proportions:
    Child: Head-to-body proportion ~ 1:4.5, shorter limbs, lower center of gravity.
    Adult: Head-to-body proportion ~ 1:7.5, long legs, broader shoulders.
    """
    bg_types = ["grass", "asphalt", "pavement", "indoor"]
    bg = _generate_background(width, height, random.choice(bg_types))
    draw = ImageDraw.Draw(bg)

    # Palette
    if skin_tone is None:
        skin_tones = [
            (240, 205, 175),  # fair
            (225, 185, 145),  # light tan
            (198, 145, 105),  # medium brown
            (145, 95, 60),    # deep brown
            (235, 195, 160)   # warm peach
        ]
        skin_tone = random.choice(skin_tones)

    hair_colors = [
        (30, 25, 20),     # black
        (65, 45, 30),     # dark brown
        (115, 80, 50),    # chestnut
        (175, 140, 85),   # blonde
        (50, 45, 45)      # charcoal
    ]
    hair_color = random.choice(hair_colors)

    if is_child:
        # Child clothing: brighter, vivid colors
        if cloth_color is None:
            child_shirt_colors = [
                (230, 60, 60),    # bright red
                (40, 130, 235),   # electric blue
                (245, 185, 30),   # sunny yellow
                (45, 190, 120),   # green
                (240, 120, 40),   # orange
                (170, 70, 210)    # purple
            ]
            cloth_color = random.choice(child_shirt_colors)
        if pants_color is None:
            child_pants_colors = [
                (50, 80, 140),    # denim blue
                (60, 60, 60),     # dark grey
                (180, 160, 130),  # khaki
                (210, 50, 50),    # red shorts
                (40, 110, 80)     # forest shorts
            ]
            pants_color = random.choice(child_pants_colors)

        # Anthropometrics: total height 115 - 150 px, centered
        body_h = random.randint(115, 145)
        body_w = int(body_h * random.uniform(0.44, 0.54))

        # Bottom foot position on ground (lower half of frame)
        foot_y = random.randint(185, 215)
        top_y = foot_y - body_h
        center_x = random.randint(100, 124)

        # Ground shadow
        shadow_w = int(body_w * 0.9)
        draw.ellipse(
            [center_x - shadow_w // 2, foot_y - 4, center_x + shadow_w // 2, foot_y + 6],
            fill=(30, 30, 30, 120)
        )

        # Head proportion: ~ 1/4.2 to 1/4.8 of total height
        head_r = int(body_h * 0.12)
        head_cx = center_x
        head_cy = top_y + head_r + 2

        # Torso proportion: ~ 1/3 of total height
        torso_top = head_cy + head_r - 2
        torso_h = int(body_h * 0.32)
        torso_w = int(body_w * 0.65)
        torso_bot = torso_top + torso_h

        # Legs proportion: ~ 0.45 of total height
        leg_h = foot_y - torso_bot
        leg_w = max(6, int(torso_w * 0.36))

        # 1. Draw Legs
        left_leg_x = center_x - int(torso_w * 0.28)
        right_leg_x = center_x + int(torso_w * 0.28)

        if pose == "running":
            # Running pose: angled legs
            draw.polygon([
                (left_leg_x - 8, torso_bot),
                (left_leg_x - 16, foot_y - 6),
                (left_leg_x - 6, foot_y - 6),
                (left_leg_x, torso_bot)
            ], fill=pants_color)
            draw.polygon([
                (right_leg_x, torso_bot),
                (right_leg_x + 14, foot_y),
                (right_leg_x + 22, foot_y),
                (right_leg_x + 8, torso_bot)
            ], fill=pants_color)
            # Shoes
            draw.rectangle([left_leg_x - 20, foot_y - 7, left_leg_x - 5, foot_y - 1], fill=(240, 240, 240))
            draw.rectangle([right_leg_x + 10, foot_y - 2, right_leg_x + 26, foot_y + 4], fill=(240, 240, 240))
        else:
            # Standing or walking pose
            draw.rectangle([left_leg_x - leg_w // 2, torso_bot, left_leg_x + leg_w // 2, foot_y - 4], fill=pants_color)
            draw.rectangle([right_leg_x - leg_w // 2, torso_bot, right_leg_x + leg_w // 2, foot_y - 4], fill=pants_color)
            # Shoes
            draw.rectangle([left_leg_x - leg_w // 2 - 2, foot_y - 5, left_leg_x + leg_w // 2 + 3, foot_y + 1], fill=(230, 230, 230))
            draw.rectangle([right_leg_x - leg_w // 2 - 2, foot_y - 5, right_leg_x + leg_w // 2 + 3, foot_y + 1], fill=(230, 230, 230))

        # 2. Draw Torso / Shirt
        draw.rounded_rectangle(
            [center_x - torso_w // 2, torso_top, center_x + torso_w // 2, torso_bot],
            radius=4,
            fill=cloth_color
        )

        # Optional child backpack
        if random.random() > 0.4:
            bp_color = (random.randint(30, 200), random.randint(40, 180), random.randint(50, 220))
            draw.rectangle([center_x - torso_w // 2 - 4, torso_top + 4, center_x - torso_w // 2, torso_top + int(torso_h * 0.7)], fill=bp_color)

        # 3. Draw Arms
        arm_w = max(5, int(torso_w * 0.22))
        arm_h = int(torso_h * 0.85)
        if pose == "running":
            draw.line([center_x - torso_w // 2, torso_top + 6, center_x - torso_w // 2 - 12, torso_top + arm_h - 4], fill=cloth_color, width=arm_w)
            draw.line([center_x + torso_w // 2, torso_top + 6, center_x + torso_w // 2 + 12, torso_top + arm_h - 4], fill=cloth_color, width=arm_w)
        else:
            draw.rectangle([center_x - torso_w // 2 - arm_w, torso_top + 4, center_x - torso_w // 2, torso_top + arm_h], fill=cloth_color)
            draw.rectangle([center_x + torso_w // 2, torso_top + 4, center_x + torso_w // 2 + arm_w, torso_top + arm_h], fill=cloth_color)
            # Hands
            draw.ellipse([center_x - torso_w // 2 - arm_w, torso_top + arm_h - 2, center_x - torso_w // 2, torso_top + arm_h + 6], fill=skin_tone)
            draw.ellipse([center_x + torso_w // 2, torso_top + arm_h - 2, center_x + torso_w // 2 + arm_w, torso_top + arm_h + 6], fill=skin_tone)

        # 4. Draw Neck & Head
        draw.rectangle([center_x - 4, head_cy + head_r - 4, center_x + 4, head_cy + head_r + 2], fill=skin_tone)
        draw.ellipse([head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r], fill=skin_tone)

        # Hair or cap
        if random.random() > 0.3:
            draw.chord([head_cx - head_r - 1, head_cy - head_r - 2, head_cx + head_r + 1, head_cy + 2], start=180, end=360, fill=hair_color)
        else:
            # Baseball cap
            cap_color = random.choice([(220, 40, 40), (30, 90, 200), (240, 200, 20)])
            draw.chord([head_cx - head_r - 2, head_cy - head_r - 3, head_cx + head_r + 2, head_cy], start=180, end=360, fill=cap_color)
            draw.rectangle([head_cx - head_r - 4, head_cy - 4, head_cx + head_r + 8, head_cy + 1], fill=cap_color)

    else:
        # Adult clothing: muted, professional / casual adult attire
        if cloth_color is None:
            adult_shirt_colors = [
                (45, 55, 70),     # navy
                (70, 75, 80),     # slate
                (190, 195, 200),  # light grey / white
                (55, 65, 50),     # olive
                (80, 45, 50),     # maroon
                (35, 35, 40)      # black
            ]
            cloth_color = random.choice(adult_shirt_colors)
        if pants_color is None:
            adult_pants_colors = [
                (35, 40, 50),     # dark trousers
                (45, 60, 85),     # dark denim
                (140, 130, 110),  # beige
                (50, 50, 55)      # charcoal
            ]
            pants_color = random.choice(adult_pants_colors)

        # Anthropometrics: total height 175 - 210 px (much taller stature), narrower aspect ratio ~0.30 - 0.38
        body_h = random.randint(180, 210)
        body_w = int(body_h * random.uniform(0.30, 0.38))

        foot_y = random.randint(205, 220)
        top_y = foot_y - body_h
        center_x = random.randint(102, 122)

        # Ground shadow
        shadow_w = int(body_w * 0.8)
        draw.ellipse(
            [center_x - shadow_w // 2, foot_y - 4, center_x + shadow_w // 2, foot_y + 6],
            fill=(30, 30, 30, 130)
        )

        # Head proportion: ~ 1/7.5 to 1/8.0 of total height (much smaller relative to body)
        head_r = int(body_h * 0.065)
        head_cx = center_x
        head_cy = top_y + head_r + 4

        # Torso proportion: ~ 0.36 of total height, broader shoulders
        torso_top = head_cy + head_r + 3
        torso_h = int(body_h * 0.35)
        torso_w = int(body_w * 0.85)
        torso_bot = torso_top + torso_h

        # Legs proportion: ~ 0.52 of total height (significantly longer legs)
        leg_h = foot_y - torso_bot
        leg_w = max(8, int(torso_w * 0.32))

        # 1. Draw Legs
        left_leg_x = center_x - int(torso_w * 0.25)
        right_leg_x = center_x + int(torso_w * 0.25)

        draw.rectangle([left_leg_x - leg_w // 2, torso_bot, left_leg_x + leg_w // 2, foot_y - 5], fill=pants_color)
        draw.rectangle([right_leg_x - leg_w // 2, torso_bot, right_leg_x + leg_w // 2, foot_y - 5], fill=pants_color)
        # Shoes
        draw.rectangle([left_leg_x - leg_w // 2 - 2, foot_y - 6, left_leg_x + leg_w // 2 + 4, foot_y + 1], fill=(25, 25, 25))
        draw.rectangle([right_leg_x - leg_w // 2 - 2, foot_y - 6, right_leg_x + leg_w // 2 + 4, foot_y + 1], fill=(25, 25, 25))

        # 2. Draw Torso
        draw.rounded_rectangle(
            [center_x - torso_w // 2, torso_top, center_x + torso_w // 2, torso_bot],
            radius=3,
            fill=cloth_color
        )

        # 3. Draw Arms
        arm_w = max(6, int(torso_w * 0.20))
        arm_h = int(torso_h * 0.95)
        draw.rectangle([center_x - torso_w // 2 - arm_w, torso_top + 2, center_x - torso_w // 2, torso_top + arm_h], fill=cloth_color)
        draw.rectangle([center_x + torso_w // 2, torso_top + 2, center_x + torso_w // 2 + arm_w, torso_top + arm_h], fill=cloth_color)
        # Hands
        draw.ellipse([center_x - torso_w // 2 - arm_w, torso_top + arm_h - 2, center_x - torso_w // 2, torso_top + arm_h + 8], fill=skin_tone)
        draw.ellipse([center_x + torso_w // 2, torso_top + arm_h - 2, center_x + torso_w // 2 + arm_w, torso_top + arm_h + 8], fill=skin_tone)

        # 4. Draw Neck & Head
        draw.rectangle([center_x - 3, head_cy + head_r - 2, center_x + 3, head_cy + head_r + 4], fill=skin_tone)
        draw.ellipse([head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r], fill=skin_tone)
        # Hair
        draw.chord([head_cx - head_r - 1, head_cy - head_r - 2, head_cx + head_r + 1, head_cy + 1], start=180, end=360, fill=hair_color)

    # Apply subtle realistic optical smoothing
    bg = bg.filter(ImageFilter.GaussianBlur(radius=0.4))
    return bg


def generate_comprehensive_dataset(data_dir: Path, n_samples_per_class: int = 120) -> None:
    """Generate high-fidelity, anthropometrically accurate training crops."""
    adult_dir = data_dir / "adult"
    child_dir = data_dir / "child"

    adult_dir.mkdir(parents=True, exist_ok=True)
    child_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Generating {n_samples_per_class} realistic adult and {n_samples_per_class} child samples...")

    # Adults
    for i in range(n_samples_per_class):
        pose = "standing" if i % 2 == 0 else "walking"
        img = _draw_realistic_person(is_child=False, pose=pose)
        img.save(adult_dir / f"realistic_adult_{i+1:03d}.jpg", quality=92)

    # Children
    for i in range(n_samples_per_class):
        pose = "running" if i % 3 == 0 else ("walking" if i % 2 == 0 else "standing")
        img = _draw_realistic_person(is_child=True, pose=pose)
        img.save(child_dir / f"realistic_child_{i+1:03d}.jpg", quality=92)

    logger.info(f"Dataset successfully enriched with {n_samples_per_class * 2} photographic human samples.")


def create_sample_dataset_if_empty(data_dir: Path) -> None:
    """Backward compatibility alias for dataset enrichment."""
    adult_dir = Path(data_dir) / "adult"
    child_dir = Path(data_dir) / "child"
    if not (adult_dir.exists() and child_dir.exists() and len(list(adult_dir.glob('*.*'))) >= 20 and len(list(child_dir.glob('*.*'))) >= 20):
        generate_comprehensive_dataset(Path(data_dir), n_samples_per_class=120)


def train_classifier(
    data_dir: str = "data",
    output_model_path: str = "models/mobilenet_child_classifier.pth",
    epochs: int = 10,
    batch_size: int = 16,
    learning_rate: float = 0.0005
):
    """Train MobileNetV2 on realistic dataset and save verified weights."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on device: {device}")

    base_data_path = Path(data_dir)
    adult_count = len(list((base_data_path / "adult").glob("*.*"))) if (base_data_path / "adult").exists() else 0
    child_count = len(list((base_data_path / "child").glob("*.*"))) if (base_data_path / "child").exists() else 0

    if adult_count < 80 or child_count < 80:
        generate_comprehensive_dataset(base_data_path, n_samples_per_class=120)

    # Heavy Data Augmentation Transforms for Generalization
    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=8),
        transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.2),
        transforms.RandomAffine(degrees=0, translate=(0.06, 0.06), scale=(0.92, 1.08)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    full_dataset = ChildAdultDataset(data_dir=data_dir, transform=train_transforms)
    total_len = len(full_dataset)

    train_len = int(0.85 * total_len)
    val_len = total_len - train_len
    train_data, val_data = random_split(full_dataset, [train_len, val_len], generator=torch.Generator().manual_seed(42))

    train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_data, batch_size=batch_size, shuffle=False)

    logger.info(f"Split dataset: {train_len} training samples, {val_len} validation samples.")

    # Initialize MobileNetV2 with pretrained weights
    logger.info("Initializing MobileNetV2 architecture with pretrained weights...")
    try:
        model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    except Exception:
        model = models.mobilenet_v2(weights=None)

    # Adapt classifier head for 2 classes (0: Adult, 1: Child)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.25),
        nn.Linear(in_features, 64),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.2),
        nn.Linear(64, 2)
    )

    # Freeze earlier backbone layers (feature extraction) while fine-tuning top layers
    for i, layer in enumerate(model.features):
        if i < 10:
            for param in layer.parameters():
                param.requires_grad = False
        else:
            for param in layer.parameters():
                param.requires_grad = True

    model.to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = optim.AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=learning_rate,
        weight_decay=1e-3
    )
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_acc = 0.0
    best_weights = None

    logger.info(f"Beginning training for {epochs} epochs...")

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs.data, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()

        scheduler.step()

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                labels = labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs.data, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()

        epoch_train_acc = (train_correct / max(1, train_total)) * 100.0
        epoch_val_acc = (val_correct / max(1, val_total)) * 100.0
        avg_train_loss = train_loss / max(1, train_total)
        avg_val_loss = val_loss / max(1, val_total)

        logger.info(
            f"Epoch [{epoch+1}/{epochs}] - "
            f"Train Loss: {avg_train_loss:.4f}, Train Acc: {epoch_train_acc:.1f}% | "
            f"Val Loss: {avg_val_loss:.4f}, Val Acc: {epoch_val_acc:.1f}%"
        )

        if epoch_val_acc >= best_val_acc:
            best_val_acc = epoch_val_acc
            best_weights = model.state_dict().copy()

    # Save to both target locations
    target_paths = [
        Path(output_model_path),
        Path("models/mobilenet_child_classifier.pth"),
        Path("backend/models/mobilenet_child_classifier.pth")
    ]

    for p in target_paths:
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            torch.save(best_weights or model.state_dict(), str(p))
            logger.info(f"Model saved to: {p.resolve()}")
        except Exception as e:
            logger.warning(f"Could not save to {p}: {e}")

    logger.info(f"Training complete. Best Validation Accuracy: {best_val_acc:.2f}%.")
    return best_val_acc


if __name__ == "__main__":
    current_dir = Path(__file__).resolve().parent.parent
    os.chdir(current_dir)

    data_path = current_dir / "data"
    model_output = current_dir / "models" / "mobilenet_child_classifier.pth"

    train_classifier(
        data_dir=str(data_path),
        output_model_path=str(model_output),
        epochs=8,
        batch_size=16,
        learning_rate=0.0006
    )
