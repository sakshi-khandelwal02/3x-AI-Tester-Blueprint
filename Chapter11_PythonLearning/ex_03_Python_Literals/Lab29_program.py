

# Task for the Today
# Take a 3 input from the user
# perform the sub, sub, mul and div

num1 = float(input("Enter first number: "))
num2 = float(input("Enter second number: "))
num3 = float(input("Enter third number: "))

sum = num1 + num2 + num3
sub = num1 - num2 - num3
mul = num1 * num2 * num3
if num2 != 0 and num3 != 0:
    div = num1 / num2 / num3
else:
    div = "Division by zero is not allowed."    

print("Sum:", sum)
print("Subtraction:", sub)
print("Multiplication:", mul)
print("Division:", div)

#a//b - this is floor division operator which returns the largest integer less than or equal to the result of the division.
#a%b - this is modulus operator which returns the remainder of the division.
#a***b - this is exponentiation operator which returns the result of raising a to the power of b.