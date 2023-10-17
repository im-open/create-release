#!/bin/bash

name=''
value1=''
value2=''

for arg in "$@"; do
    case $arg in
    --name)
        name=$2
        shift # Remove argument --name from `$@`
        shift # Remove argument value from `$@`
        ;;
    --value1)
        value1=$2
        shift # Remove argument --expected from `$@`
        shift # Remove argument value from `$@`
        ;;
    --value2)
        value2=$2
        shift # Remove argument --actual from `$@`
        shift # Remove argument value from `$@`
        ;;
    
    esac
done

echo "
$name Value 1: '$value1'"
echo "$name Value 2:   '$value2'"

if [ "$value1" == "$value2" ]; then
  echo "The expected $name values match but they should not."  
  exit 1
else 
  echo "The expected and actual $name values do not match as expected."
fi