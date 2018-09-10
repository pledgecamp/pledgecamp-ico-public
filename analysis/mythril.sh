
if [ ! -d "pyenv3" ]; then
    echo "mythril not installed, try running static-analysis-setup.sh first"
    exit 1
fi

source pyenv3/bin/activate

if hash myth 2>/dev/null; then
    myth "$@"
    deactivate
else
    echo "mythril not installed correctly"
    deactivate
    exit 1
fi
