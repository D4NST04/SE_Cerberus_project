FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 \
    libx11-xcb1 libxrender1 libxext6 libxcb1 libx11-6 \
    qtbase5-dev qtbase5-dev-tools \
    python3-pyqt5 python3-pyqt5.qtsvg python3-pyqt5.qtwebengine \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["python", "app/main.py"]
