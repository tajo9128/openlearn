FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir psycopg2-binary bcrypt
COPY auth_shim.py .
ENV LOCALDB_DSN=postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@postgres:5432/learn
CMD ["python", "-u", "auth_shim.py"]
