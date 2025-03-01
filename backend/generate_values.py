import secrets

# Generate a secure secret key for Flask
flask_secret = secrets.token_hex(24)
print(f"Flask SECRET_KEY: {flask_secret}")

# Generate a secure secret key for JWT
jwt_secret = secrets.token_hex(24)
print(f"JWT SECRET_KEY: {jwt_secret}")