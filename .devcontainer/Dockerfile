FROM mcr.microsoft.com/devcontainers/base:debian

RUN curl https://mise.run | sh

RUN echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc && \
    echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
