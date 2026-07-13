# Task for the Today
# Take a 2 input from the user
# Print the Quotient and Remainder
# 15 ->  num1
# 2 -> num2
# Q -> 7
# R -> 1

user_input1 = int(input("Enter the first number (numerator): "))
user_input2 = int(input("Enter the second number (denominator): ")) 
quotient = user_input1 // user_input2
remainder = user_input1 % user_input2
print(f"Quotient: {quotient}")
print(f"Remainder: {remainder}")

print(divmod(user_input1, user_input2))  # This will print both quotient and remainder as a tuple