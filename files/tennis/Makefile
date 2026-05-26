tennis-exam-prep.pdf: Main.tex theorems.tex commands.tex $(wildcard chapters/*.tex)
	latexmk -xelatex -interaction=nonstopmode Main.tex
	mv Main.pdf tennis-exam-prep.pdf

clean:
	latexmk -C

.PHONY: clean
