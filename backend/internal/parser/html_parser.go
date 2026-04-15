package parser

import (
	"strings"
	"tubes2-backend/internal/models"

	"golang.org/x/net/html"
)

func ParseHTML(rawHTML string) (*models.Node, error) {
	reader := strings.NewReader(rawHTML)

	// menggunakan html.Parse dari package golang.org/x/net/html
	doc, err := html.Parse(reader)
	if err != nil {
		return nil, err
	}

	rootNode := mapNode(doc)
	return rootNode, nil
}

func mapNode(n *html.Node) *models.Node {
	if n == nil {
		return nil
	}
	myNode := &models.Node{}

	switch n.Type {
	case html.ElementNode:
		myNode.TagName = n.Data
		if len(n.Attr) > 0 {
			myNode.Attributes = make(map[string]string, len(n.Attr))
			for _, attr := range n.Attr {
				myNode.Attributes[attr.Key] = attr.Val
				if attr.Key == "id" {
					myNode.ID = attr.Val
				}
				if attr.Key == "class" {
					myNode.Classes = attr.Val
				}
			}
		}
	case html.TextNode:
		text := strings.TrimSpace(n.Data)
		if text == "" {
			return nil
		}
		myNode.TagName = "#text"
		myNode.TextContent = text
	case html.DocumentNode:
		myNode.TagName = "#document"
	default:
		return nil
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		childNode := mapNode(c)
		if childNode != nil {
			childNode.Parent = myNode
			myNode.Children = append(myNode.Children, childNode)
		}
	}

	return myNode
}
