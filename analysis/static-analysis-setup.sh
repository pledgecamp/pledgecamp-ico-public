virtualenv pyenv2 -p python2
virtualenv pyenv3 -p python3

source pyenv3/bin/activate
pip install mythril
deactivate

command -v pandoc >/dev/null 2>&1 || { echo "Failed to install Oyente, please install pandoc first." >&2; exit 1; }

source pyenv2/bin/activate
pip install web3==2.7.0
pip install oyente
deactivate

