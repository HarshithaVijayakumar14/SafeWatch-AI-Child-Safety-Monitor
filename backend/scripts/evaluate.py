"""
Evaluation Script for Child vs. Adult Classifier in SafeWatch AI
Evaluates model on dataset and computes Accuracy, Precision, Recall, F1, and Confusion Matrix.
"""
from pathlib import Path
import os
import sys
import logging
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import models, transforms

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.train_classifier import ChildAdultDataset, create_sample_dataset_if_empty

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("safewatch.evaluator")


def evaluate_classifier(
    data_dir: str = "data",
    model_path: str = "models/mobilenet_child_classifier.pth",
    batch_size: int = 8
):
    """Evaluate trained MobileNetV2 model and print metrics."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Evaluating model on device: {device}")

    base_data = Path(data_dir)
    create_sample_dataset_if_empty(base_data)

    eval_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    dataset = ChildAdultDataset(data_dir=data_dir, transform=eval_transforms)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)

    weights_file = Path(model_path)
    if not weights_file.exists():
        logger.error(f"Trained model not found at {weights_file}. Please run train_classifier.py first.")
        return

    # Build model architecture
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    state_dict = torch.load(str(weights_file), map_location=device)

    # Automatically adapt head structure to state_dict
    if "classifier.1.4.weight" in state_dict or "classifier.1.3.weight" in state_dict:
        model.classifier[1] = nn.Sequential(
            nn.Dropout(p=0.25),
            nn.Linear(in_features, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(64, 2)
        )
    else:
        model.classifier[1] = nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(in_features, 2)
        )

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    y_true = []
    y_pred = []

    with torch.no_grad():
        for images, labels in dataloader:
            images = images.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs.data, 1)

            y_true.extend(labels.cpu().numpy())
            y_pred.extend(predicted.cpu().numpy())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # Compute Confusion Matrix
    # Classes: 0 = Adult, 1 = Child
    tp_adult = int(np.sum((y_true == 0) & (y_pred == 0)))
    fp_adult = int(np.sum((y_true == 1) & (y_pred == 0)))
    fn_adult = int(np.sum((y_true == 0) & (y_pred == 1)))

    tp_child = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp_child = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn_child = int(np.sum((y_true == 1) & (y_pred == 0)))

    total = len(y_true)
    accuracy = float(np.sum(y_true == y_pred) / max(1, total))

    # Metrics for Adult
    prec_adult = tp_adult / max(1, (tp_adult + fp_adult))
    rec_adult = tp_adult / max(1, (tp_adult + fn_adult))
    f1_adult = 2 * (prec_adult * rec_adult) / max(1e-6, (prec_adult + rec_adult))

    # Metrics for Child
    prec_child = tp_child / max(1, (tp_child + fp_child))
    rec_child = tp_child / max(1, (tp_child + fn_child))
    f1_child = 2 * (prec_child * rec_child) / max(1e-6, (prec_child + rec_child))

    print("\n" + "=" * 55)
    print("      SAFEWATCH CLASSIFIER EVALUATION REPORT")
    print("=" * 55)
    print(f"Total Test Samples: {total}")
    print(f"Overall Accuracy:   {accuracy * 100:.2f}%\n")

    print(f"{'Class':<12} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("-" * 55)
    print(f"{'Adult':<12} | {prec_adult:<10.3f} | {rec_adult:<10.3f} | {f1_adult:<10.3f}")
    print(f"{'Child':<12} | {prec_child:<10.3f} | {rec_child:<10.3f} | {f1_child:<10.3f}")
    print("-" * 55)

    print("\nConfusion Matrix:")
    print("                 Predicted Adult | Predicted Child")
    print(f"Actual Adult  | {tp_adult:^15} | {fn_adult:^15}")
    print(f"Actual Child  | {fn_child:^15} | {tp_child:^15}")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    current_dir = Path(__file__).resolve().parent.parent
    os.chdir(current_dir)

    data_path = current_dir / "data"
    model_output = current_dir / "models" / "mobilenet_child_classifier.pth"

    evaluate_classifier(
        data_dir=str(data_path),
        model_path=str(model_output)
    )
