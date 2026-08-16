#user_input=input("Enter a string")
user_input="swiss"
s= set(user_input)
def non_repeated_characters(s):
    for char in s:
        if user_input.count(char) == 1:
            print(char, end=" ")    
non_repeated_characters(user_input)