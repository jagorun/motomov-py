"""Helpers: run example code, return stdout (or last stderr line)."""
import subprocess, textwrap

def run(code: str, stdin: str | None = None, expect_error: bool = False) -> str:
    r = subprocess.run(
        ["python3", "-c", code],
        input=stdin,
        capture_output=True,
        text=True,
    )
    if expect_error:
        err = (r.stderr or "").strip().splitlines()
        return err[-1] if err else ""
    if r.returncode != 0:
        raise RuntimeError(f"code failed:\n{code}\n---\n{r.stderr}")
    return r.stdout

if __name__ == "__main__":
    print(repr(run('print(1+1)')))
