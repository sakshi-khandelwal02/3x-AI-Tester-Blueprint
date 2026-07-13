user_age = int(input("Enter your age: "))
if user_age >= 18:
    print("You are eligible to vote.")  
else:
         print("You are not eligible to vote.")  


print("You are eligible to vote." if user_age >= 18 else "You are not eligible to vote.")