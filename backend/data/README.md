# Crop recommendation dataset

Place the **Kaggle Crop Recommendation Dataset** CSV here so the model can train on real data.

1. Download from: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset  
2. (If you get a zip, unzip it and take the `.csv` file.)  
3. Put the CSV in this folder. Supported filenames:  
   - `Crop_recommendation.csv`  
   - `crop_recommendation.csv`  
   - `CropRecommendation.csv`  

Required columns: **N**, **P**, **K**, **temperature**, **humidity**, **ph**, **rainfall**, and either **label** or **crop** (crop name).

Then start the backend; it will load and train on this file automatically.
