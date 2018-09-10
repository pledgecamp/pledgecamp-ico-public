
if [ ! -d "pyenv3" ]; then
    echo "oyente not installed, try running static-analysis-setup.sh first"
    exit 1
fi

source pyenv2/bin/activate

if hash oyente 2>/dev/null; then
    oyente "$@"
    deactivate
else
    echo "oyente not installed correctly"
    deactivate
    exit 1
fi
