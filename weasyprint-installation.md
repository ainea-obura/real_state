# 📄 WeasyPrint Installation Guide (Linux & macOS)

This guide helps you properly install [WeasyPrint](https://weasyprint.org/) along with its required system libraries on **Linux (Ubuntu/Debian)** and **macOS**.

---

## ✅ Linux (Ubuntu / Debian)

### Step 1: Update Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Required System Libraries

```bash
sudo apt install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libjpeg-dev \
    libxml2 \
    libxslt1-dev \
    zlib1g-dev \
    python3-dev \
    python3-pip \
    build-essential
```

### Step 3: (Optional) Create a Virtual Environment

```bash
python3 -m venv weasy_env
source weasy_env/bin/activate
```

### Step 4: Install WeasyPrint via pip

```bash
pip install -U pip setuptools wheel
pip install weasyprint
```

### Step 5: Test Installation

```python
# test_weasyprint.py
from weasyprint import HTML
HTML(string='<h1>Hello, PDF!</h1>').write_pdf('output.pdf')
```

```bash
python test_weasyprint.py
xdg-open output.pdf  # Optional: Open PDF viewer
```

---

## ✅ macOS (Homebrew)

### Step 1: Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install System Libraries

```bash
brew install cairo pango gdk-pixbuf libffi
```

### Step 3: (Optional) Create a Virtual Environment

```bash
python3 -m venv weasy_env
source weasy_env/bin/activate
```

### Step 4: Install WeasyPrint via pip

```bash
pip install -U pip setuptools wheel
pip install weasyprint
```

### Step 5: Test Installation

```python
# test_weasyprint.py
from weasyprint import HTML
HTML(string='<h1>Hello, PDF!</h1>').write_pdf('output.pdf')
```

```bash
open output.pdf
```

---

## 🔍 Troubleshooting

- If you see:
  ```
  WeasyPrint could not import some external libraries
  ```
  Make sure the required native libraries (like `cairo`, `pango`, or `gdk-pixbuf`) are installed properly.

- For more help, refer to the official docs:
  - [Installation Guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation)
  - [Troubleshooting](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#troubleshooting)

---

## 📌 Tips

- Use a **virtual environment** to isolate dependencies.
- Avoid using the **system Python** on macOS — prefer `brew`, `pyenv`, or Python.org versions.
- You can also containerize WeasyPrint using **Docker** for consistent builds.
