FROM python:3.12-slim

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 \
    libx11-xcb1 libxrender1 libxext6 libxcb1 libx11-6 \
    libxkbcommon-x11-0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-xinerama0 libxcb-xfixes0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY requirements.txt ./

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY app ./app

CMD ["python", "app/main.py"]
