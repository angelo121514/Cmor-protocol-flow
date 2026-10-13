FROM python:3.12.13-slim@sha256:229a2c5bfa27522db7815ea81f9bed70af17ccb9de9fc7ad142b1877b5830d36
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 IMAGE_INSPECTION_BIND=0.0.0.0 IMAGE_INSPECTION_PORT=58081 CLAMAV_HOST=clamav CLAMAV_PORT=3310
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --require-hashes -r requirements.txt
COPY inspector.py .
USER 65532:65532
EXPOSE 58081
CMD ["python","inspector.py"]
