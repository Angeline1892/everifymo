from pathlib import Path
import importlib.util
import sys

BASE_DIR = Path(__file__).resolve().parent
ASSET_DIR = BASE_DIR.parent / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)


def run_script(script_name: str):
    script_path = BASE_DIR / script_name
    module_name = script_name[:-3]

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load script: {script_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


print("Running NLP preprocessing pipeline...")
run_script("clean.py")
run_script("bm25builder.py")
run_script("embeddingbuilder.py")
run_script("faissbuilder.py")
print(f"Assets generated in: {ASSET_DIR}")
