# NixOS runtime libs for JAX/numpy in the venv (64-bit gcc-lib + zlib)
export LD_LIBRARY_PATH=/nix/store/w2nk3f7prwzpm6h13rfxh8lh46yfdysj-gcc-15.3.0-lib/lib:/nix/store/61a1nwx3w6rqyaisj5rn1sal1981apm7-zlib-1.3.2/lib
export PYTHONPATH=/home/kortux/Workspace/chagra-needle-f05/ops/needle-f05/run/needle-src
export JAX_PLATFORMS=cpu
export TF_CPP_MIN_LOG_LEVEL=2
VENV=/home/kortux/Workspace/chagra-needle-f05/ops/needle-f05/.venv-needle/bin/python
