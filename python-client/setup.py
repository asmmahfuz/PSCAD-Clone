from setuptools import setup, find_packages

setup(
    name="pscad-modern-py",
    version="5.1.0",
    description="PSCAD Modern EMTDC High-Performance Automation & Python Client SDK",
    author="PSCAD Modern Engineering Team",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
        "numpy>=1.20.0",
    ],
    extras_require={
        "all": [
            "pandas>=1.3.0",
            "matplotlib>=3.4.0",
            "scipy>=1.7.0",
            "websockets>=10.0",
        ]
    },
    python_requires=">=3.8",
)
