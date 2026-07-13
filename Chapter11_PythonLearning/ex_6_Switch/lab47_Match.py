digit = input("Enter a digit (0-9): ")

match digit:
    case '1':
        print("Monday")
    case '2':
        print("Tuesday")
    case '3':
        print("Wednesday")
    case '4':
        print("Thursday")
    case '5':
        print("Friday")
    case '6':
        print("Saturday")
    case '7':
        print("Sunday")
    case _:
        print("Invalid input. Please enter a digit between 1 and 7.")