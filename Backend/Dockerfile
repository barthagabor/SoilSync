FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
ENV PYTHON_EXECUTABLE=/opt/venv/bin/python3

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY requirements.txt ./
RUN python3 -m venv "${VIRTUAL_ENV}" \
    && pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
