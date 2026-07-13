# Create a program to sum of three number from the user input,

# if user doesn't enter any number', use default as 100, 200, 300

# Logic Building

# Step 1 - I/O and O/P

# I/O -  int

# O/P - int

# Step 2 - Rough Logic

# return n1+n2+n3

#user_input1 = input("Enter first number (default 100): ")
#user_input2 = input("Enter second number (default 200): ")
#user_input3 = input("Enter third number (default 300): ")


n1 = int(n1) if n1 else 100
n2 = int(n2) if n2 else 200
n3 = int(n3) if n3 else 300

total = n1 + n2 + n3

print("Sum =", total)
def sum_of_three(n1=100, n2=200, n3=300):
    return user_input1+user_input2+user_input3

print("Sum of three numbers is:", sum_of_three())


def find_sum(n1=100, n2=200, n3=300):
    return n1 + n2 + n3

print(find_sum())          # 600
print(find_sum(10, 20, 30)) # 60