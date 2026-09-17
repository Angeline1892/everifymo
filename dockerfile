FROM python:3.12-slim-trixie

WORKDIR /everifymo

COPY backend/requirements.txt .

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt


COPY backend/main.py ./backend/main.py
COPY backend/nlp ./backend/nlp
COPY backend/app ./backend/app

RUN cd backend && python nlp/preprocessing/buildassets.py

ENV PYTHONPATH=/everifymo/backend

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"]