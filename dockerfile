FROM python:3.12-slim-trixie

WORKDIR /everifymo

COPY backend/requirements.txt .

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

COPY backend/nlp ./backend/nlp
