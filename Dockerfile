# Use Node.js base image
FROM node:20

# Install dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg git build-essential cmake curl && \
    apt-get clean

# Set app working directory
WORKDIR /usr/src/app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy the application code
COPY . .

# Clone and build whisper.cpp
RUN git clone https://github.com/ggerganov/whisper.cpp.git && \
    cd whisper.cpp && mkdir build && cd build && cmake .. && make && \
    cp bin/whisper-cli /usr/src/app/whisper && \
    cd /usr/src/app && rm -rf whisper.cpp

# Download whisper model
RUN mkdir -p models && \
    curl -L -o models/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/models/ggml-base.en.bin

# Make whisper binary executable
RUN chmod +x /usr/src/app/whisper

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "app.js"]
