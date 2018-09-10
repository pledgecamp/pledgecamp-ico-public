# Kill any active ganache-cli instances, restart ganache-cli, and run tests
restart_ganache() {
    pkill -f ".*ganache.*"
    ganache-cli --port 8550 --gasPrice 0 --gasLimit 50000000 -e 1000000 &> /dev/null &
}
restart_ganache
truffle "$@"