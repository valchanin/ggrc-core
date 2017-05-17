set -o nounset
set -o errexit

set -x

CURRENT_SCRIPTPATH=$( cd "$(dirname "$0")" ; pwd -P )
$CURRENT_SCRIPTPATH/install_deps.sh

$CURRENT_SCRIPTPATH/../bin/jenkins/run_integration -p
