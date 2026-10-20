FROM python:3.12-slim-trixie

WORKDIR /everifymo

COPY backend/requirements.txt .

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt


COPY backend/main.py ./backend/main.py
COPY backend/nlp ./backend/nlp
COPY backend/app ./backend/app


COPY backend/app/models/ ./backend/app/models/
COPY backend/alembic ./backend/alembic
COPY backend/alembic.ini ./backend/alembic.ini

COPY extension ./extension

COPY backend/scripts ./backend/scripts

ENV PYTHONPATH=/everifymo/backend

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]