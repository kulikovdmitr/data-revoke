FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
libpango-1.0-0 libpangoft2-1.0-0 fonts-dejavu-core \
&& rm -rf /var/lib/apt/lists/* 

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -e ".[dev]"

EXPOSE 8000
CMD ["unvicorn", "revoke.api:app", "--host", "0.0.0.0", "--port", "8000"]