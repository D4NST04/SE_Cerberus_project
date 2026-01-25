import tkinter as tk
from gui import MainWindow
from controller import Controller

def main():
    root = tk.Tk()
    gui = MainWindow( root )
    Controller( root, gui )
    root.mainloop()

if __name__ == "__main__":
    main()

