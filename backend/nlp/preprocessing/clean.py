 #### Cleaning of Registered Product to build BM25 index ####
import pandas as pd
import numpy as np
import re
import unicodedata
import pickle
from pathlib import Path

# Load CSV file of registered products
BASE_DIR = Path(__file__).resolve().parent

datasets_dir = BASE_DIR.parent / "datasets"
asset_dir = BASE_DIR.parent / "assets"
asset_dir.mkdir(parents=True, exist_ok=True)

file_path = datasets_dir / "registered.csv"
df = pd.read_csv(file_path, low_memory=False)


# Change this if needed after checking the output above
# The error indicates 'PRODUCT_NAME' is not found. From the printout, 'Product Title' is the correct column.
TITLE_COLUMN = "PRODUCT_NAME"
# BRAND_COLUMN and COMPANY_COLUMN are not present in 'unregistered.csv' as per column list.
# These should only be used if you are loading a 'registered' products dataset with these columns.
BRAND_COLUMN = "BRAND_NAME"
COMPANY_COLUMN = "COMPANY_NAME"

#-----Cleaning -------#
# Marketing words to remove
marketing_words = [
    'official',
    'authentic',
    'original',
    'bestseller',
    'best seller',
    'sale',
    'promo',
    'discount',
    'free shipping',
    '100 genuine',
    'guaranteed'
]

# Abbreviations
abbreviations = {
    'pc': 'piece',
    'pcs': 'pieces',
    'ml': 'milliliter',
    'mg': 'milligram',
    'kg': 'kilogram',
    'g': 'gram'
}

# Brand aliases
brand_aliases = {
    'p&g': 'procter gamble',
    'pg': 'procter gamble',
    'unilvr': 'unilever'
}

def clean_title(text):

    if pd.isna(text):
        return ""

    text = str(text)

    # Unicode normalization
    text = unicodedata.normalize('NFKD', text)

    # Lowercase
    text = text.lower()

    # Remove emojis and unicode symbols
    text = text.encode('ascii', 'ignore').decode('ascii')

    # Handle brand aliases
    for alias, standard in brand_aliases.items():
        text = text.replace(alias, standard)

    # Remove marketing words
    for word in marketing_words:
        text = text.replace(word, '')

    # Normalize units
    text = re.sub(r'(\d+)\s*ml', r'\1 milliliter', text)
    text = re.sub(r'(\d+)\s*mg', r'\1 milligram', text)
    text = re.sub(r'(\d+)\s*kg', r'\1 kilogram', text)
    text = re.sub(r'(\d+)\s*g', r'\1 gram', text)

    # Expand abbreviations
    words = text.split()
    words = [abbreviations.get(word, word) for word in words]
    text = " ".join(words)

    # Remove special characters and punctuation
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)


    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()


    return text

# Apply the cleaning function to the specified column
df[TITLE_COLUMN] = df[TITLE_COLUMN].apply(clean_title)


# Save cleaned dataset
output_path = asset_dir / "Registered_cleaned.csv"
df.to_csv(output_path, index=False)

#Save the df as pickle
with open(asset_dir / "Registered_cleaned.pkl", 'wb') as f:
    pickle.dump(df, f)

print("\nRegistered Cleaning completed!")


#------------------------------------------------------------------------------------------------------------------------#

#### Cleaning of Unregistered Product to build BM25 index ####

# Load CSV file of registered products
file_path = datasets_dir / "unregistered.csv"
df = pd.read_csv(file_path)


# Change this if needed after checking the output above
UN_TITLE_COLUMN = "Product Title"

# Apply the cleaning function to the specified column
df[UN_TITLE_COLUMN] = df[UN_TITLE_COLUMN].apply(clean_title)


# Save cleaned dataset
output_path = asset_dir / "Unregistered_cleaned.csv"
df.to_csv(output_path, index=False)

with open(asset_dir / "Unregistered_cleaned.pkl", 'wb') as f:
    pickle.dump(df, f)

print("\nUnregistered Cleaning completed!")
