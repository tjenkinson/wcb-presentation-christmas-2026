#!/usr/bin/env bash
set -euo pipefail

curl https://mise.run | sh

echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc

mise trust
MISE_NODE_VERIFY=false mise install --yes

echo "Done!"
