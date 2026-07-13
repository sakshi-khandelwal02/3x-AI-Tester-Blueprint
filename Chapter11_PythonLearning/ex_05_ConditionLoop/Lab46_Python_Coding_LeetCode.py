# Write a program that calculates and displays the letter grade

# for a given numerical score (e.g., A, B, C, D, or F)

# based on the following grading scale

# A: 90-100

# B: 80-89

# C: 70-79

# D: 60-69

# F: 0-59

# Get the numerical score from the user
score = float(input("Enter the numerical score (0-100): "))
if score >= 90:
    grade = 'A'
elif score >= 80:
    grade = 'B'
elif score >= 70:
    grade = 'C'
elif score >= 60:
    grade = 'D'
elif score <= 59:
    grade = 'F'
else:
    grade = 'Invalid score'
print(f"The letter grade for the score {score} is: {grade}")