# Environment Variables

Required Environment Variables.

| Variable name                | Description                      |
|------------------------------|----------------------------------|
| `S3_ACCESS_KEY_ID`           | S3 access key                    |
| `S3_BUCKET_NAME`             | Bucket name                      |
| `S3_ENDPOINT`                | Endpoint                         |
| `S3_SECRET_ACCESS_KEY`       | Secret access key                |


#### Add `After Effects` path to `$PATH` variable
To call `aerender` executable path of the `Ae` must be in `PATH` variable.
##### Windows
"`After Effects/Support Files`" for `aerender.exe` and `afterfx.exe`.
##### macOS
"`After Effects`" for `aerender` script exec is not using in `macOS`
don't need `After Effects` executable. Instead it is using 
[AppleScript](/src/lib/engine/after-effects.js#L28) to run the script.


Optional Environment Variables.

| Variable name         | Description           | Default                                     |
|-----------------------|-----------------------|---------------------------------------------|
| `LOG_LEVEL`           | Log level             | `info`                                      |
